/* eslint-disable @typescript-eslint/no-explicit-any */
import {useCallback, useEffect, useState} from "react";
import {useParams, useSearchParams} from "react-router-dom";
import {API} from "@/service";
import {ComponentExportFunction, Field, Typ} from "@/types/component.ts";
import ErrorBoundary from "@/components/errorBoundary";
import WorkerLeftNav from "./leftNav";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {ClipboardCopy} from "lucide-react";
import {cn, sanitizeInput} from "@/lib/utils";
import ReactJson from "react-json-view";
import {Textarea} from "@/components/ui/textarea";

/* ----------------------------------
 * Helpers
 * ---------------------------------- */

/**
 * Recursively builds a JSON skeleton for the given fields.
 * Useful for “preview” structures before user edits.
 */
function buildJsonSkeleton(field: Field): any {
    const {type, fields} = field.typ;
    switch (type) {
        // ------------------------------
        // Simple scalar types
        // ------------------------------
        case "Str":
        case "Chr":
            return "";

        case "Bool":
            return false;

        case "F64":
        case "F32":
        case "U64":
        case "S64":
        case "U32":
        case "S32":
        case "U16":
        case "S16":
        case "U8":
        case "S8":
            return 0;

        // ------------------------------
        // More complex / composite types
        // ------------------------------
        case "Record": {
            // For a record, we typically expect `fields` to be an array of sub-fields
            // Each sub-field is itself a Field with a type definition
            const obj: Record<string, any> = {};
            fields?.forEach((subField: Field) => {
                obj[subField.name] = buildJsonSkeleton(subField);
            });
            return obj;
        }

        case "Tuple": {
            // For tuples, we may have an array of sub-fields
            // Return an array of skeletons in the same order
            if (!fields) return [];
            return fields.map((subField: Field) => buildJsonSkeleton(subField));
        }

        case "List": {
            // A list has an item type. We can return an array of one example item or an empty array
            // If you want at least one default item, do:
            // return [ buildJsonSkeleton({ typ: item }) ];
            // Otherwise:
            return [];
        }

        // ------------------------------
        // Specialized algebraic/data types
        // ------------------------------
        case "Option": {
            // An Option might have an underlying type (e.g. Some T | None).
            // You can decide if you want to default to None or a skeleton of Some(T).
            // Example: default to null to represent "None"
            return null;
            // Or, if you want to give users a "Some" by default, you might do:
            // return buildJsonSkeleton({ typ: item });
        }

        case "Enum": {
            // Enums usually represent a finite set of string/discriminants.
            // If you have a list of possible variants, pick one. Otherwise, default:
            return "";
        }

        // ------------------------------
        // Fallback for any unhandled type
        // ------------------------------
        default:
            return null;
    }
}

/**
 * Convert a component function’s parameter definition
 * into a default JSON array for user editing.
 */
function parseToJsonEditor(data: ComponentExportFunction) {
    return data.parameters.map((param) => buildJsonSkeleton(param));
}

/**
 * Converts user’s JSON input into the payload
 * format expected by the server.
 */
function parseToApiPayload(
    input: any[],
    actionDefinition: ComponentExportFunction
) {
    const payload = {params: [] as Array<{ value: any; typ: Typ }>};

    const parseValue = (data: any, typeDef: Typ) => {
        switch (typeDef.type) {
            case "Str":
            case "U32":
            case "F32":
            case "I32":
            case "Tuple":
            case "Record":
                return data;
            case "List":
                return Array.isArray(data) ? data : [data];
            default:
                throw new Error(`Unsupported type: ${typeDef.type}`);
        }
    };

    actionDefinition.parameters.forEach((param, index) => {
        // Each param is presumably an item in input
        const userValue = input[index];
        payload.params.push({
            value: parseValue(userValue, param.typ),
            typ: param.typ,
        });
    });

    return payload;
}

/** Safely formats JSON with indentation; returns the original string on error. */
function safeFormatJSON(input: string): string {
    try {
        const parsed = JSON.parse(input);
        return JSON.stringify(parsed, null, 2);
    } catch {
        return input; // Return as-is if parse fails
    }
}

/* ----------------------------------
 * Main Component
 * ---------------------------------- */

export default function WorkerInvoke() {
    const {componentId = "", workerName = ""} = useParams();
    const [searchParams] = useSearchParams();

    const name = searchParams.get("name") || "";
    const fn = searchParams.get("fn") || "";

    const [functionDetails, setFunctionDetails] = useState<ComponentExportFunction | null>(null);
    const [value, setValue] = useState<string>("{}");
    const [resultValue, setResultValue] = useState<string>("");
    const [error, setError] = useState<string | null>(null);

    /** Fetch function details based on URL params. */
    const fetchFunctionDetails = useCallback(async () => {
        try {
            const data = await API.getComponentByIdAsKey();
            const matchingComponent = data?.[componentId];
            if (!matchingComponent) {
                throw new Error("Component not found.");
            }

            const exportItem = matchingComponent.exports?.find(
                (e: any) => e.name === name
            );
            if (!exportItem) {
                throw new Error("Export item not found.");
            }

            const fnDetails = exportItem.functions?.find(
                (f: ComponentExportFunction) => f.name === fn
            );
            if (!fnDetails) {
                throw new Error("Function details not found.");
            }

            setFunctionDetails(fnDetails);
            const initialJson = parseToJsonEditor(fnDetails);
            // Pre-format the JSON so it looks nice in the textarea
            setValue(JSON.stringify(initialJson, null, 2));
        } catch (err: any) {
            setError(err.message || "Unable to fetch function details.");
        }
    }, [componentId, fn, name]);

    useEffect(() => {
        if (componentId && name && fn) {
            setError(null);
            fetchFunctionDetails();
        }
    }, [componentId, name, fn, fetchFunctionDetails]);

    const handleValueChange = (newValue: string) => {
        const formatted = safeFormatJSON(newValue);
        setValue(formatted);
        setResultValue("");
        setError(null);
    };

    const onInvoke = async () => {
        try {
            setError(null);
            const sanitizedValue = sanitizeInput(value);
            const parsedValue = JSON.parse(sanitizedValue);

            if (!functionDetails) {
                throw new Error("No function details loaded.");
            }

            const apiData = parseToApiPayload(parsedValue, functionDetails);

            const functionName = `${encodeURIComponent(name)}.${encodeURIComponent(`{${fn}}`)}`;
            const response = await API.invokeWorkerAwait(
                componentId,
                workerName,
                functionName,
                apiData
            );

            const newValue = JSON.stringify(response?.result?.value, null, 2);
            setResultValue(newValue);
        } catch (err: any) {
            setError(err.message || "Invalid JSON data. Please correct it before invoking.");
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(value);
    };

    return (
        <ErrorBoundary>
            <div className="flex h-screen">
                <WorkerLeftNav/>
                <div className="flex-1 flex flex-col bg-background">
                    <header className="w-full border-b py-4 px-6">
                        <h1 className="text-2xl font-semibold text-foreground truncate">
                            {workerName}
                        </h1>
                    </header>
                    <header className="w-full border-b py-4 px-6">
                        <h3>
                            {name} - {fn}
                        </h3>
                    </header>

                    <div className="p-10 space-y-6 mx-auto overflow-auto h-[90vh] w-[60%]">
                        <main className="flex-1 p-6 space-y-6">
                            <SectionCard
                                title="Preview"
                                description="Preview the current function invocation arguments"
                                value={value}
                                onValueChange={handleValueChange}
                                copyToClipboard={copyToClipboard}
                                error={error}
                            />

                            <div className="flex justify-end">
                                <Button onClick={onInvoke} className="px-6">
                                    Invoke
                                </Button>
                            </div>

                            {resultValue && (
                                <SectionCard
                                    title="Result"
                                    description="View the result of your latest worker invocation"
                                    value={resultValue}
                                    readOnly
                                />
                            )}
                        </main>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
}

/* ----------------------------------
 * Reusable SectionCard Component
 * ---------------------------------- */

interface SectionCardProps {
    title: string;
    description: string;
    value: string;
    onValueChange?: (value: string) => void;
    copyToClipboard?: () => void;
    error?: string | null;
    readOnly?: boolean;
}

function SectionCard({
                         title,
                         description,
                         value,
                         onValueChange,
                         copyToClipboard,
                         error,
                         readOnly = false,
                     }: SectionCardProps) {
    return (
        <Card className="w-full bg-background">
            <CardHeader className="flex items-center pb-2 flex-row">
                <div className="flex items-center justify-between w-full">
                    <div>
                        <CardTitle className="text-xl font-bold">{title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    {copyToClipboard && (
                        <Button variant="outline" size="sm" onClick={copyToClipboard}>
                            <ClipboardCopy className="h-4 w-4 mr-1"/>
                            Copy
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {readOnly ? (
                    <ReactJson
                        src={JSON.parse(value || "{}")}
                        name={null}
                        theme="rjv-default"
                        collapsed={false}
                        enableClipboard={false}
                        displayDataTypes={false}
                        style={{fontSize: "14px", lineHeight: "1.6"}}
                    />
                ) : (
                    <Textarea
                        value={value}
                        onChange={(e) => onValueChange?.(e.target.value)}
                        className={cn(
                            "min-h-[200px] font-mono text-sm mt-2",
                            error && "border-red-500"
                        )}
                        placeholder="Enter JSON data..."
                    />
                )}
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </CardContent>
        </Card>
    );
}