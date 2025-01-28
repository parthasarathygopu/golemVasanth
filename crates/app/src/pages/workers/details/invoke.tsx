import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { API } from "@/service";
import { ComponentExportFunction, Export } from "@/types/component.ts";
import ErrorBoundary from "@/components/errorBoundary";
import WorkerLeftNav from "./leftNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCopy } from "lucide-react";
import { cn, sanitizeInput } from "@/lib/utils";
import ReactJson from "react-json-view";
import { Textarea } from "@/components/ui/textarea";
import { formatJSON, parseToJsonEditor, parseToApiPayload } from "@/lib/worker";

export default function WorkerInvoke() {
  const { componentId = "", workerName = "" } = useParams();
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name");
  const fn = searchParams.get("fn");

  const [functionDetails, setFunctionDetails] = useState(
    {} as ComponentExportFunction
  );
  const [value, setValue] = useState<string>("{}");
  const [resultValue, setResultValue] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (componentId && name && fn) {
      setError(null);
      API.getComponentByIdAsKey().then((response) => {
        const exportItem =
          response?.[componentId]?.exports?.find(
            (exportItem) => exportItem.name === name
          ) || ({} as Export);
        const functions =
          exportItem.functions?.find(
            (functionItem: ComponentExportFunction) => functionItem.name === fn
          ) || ({} as ComponentExportFunction);
        setFunctionDetails(functions);
        const formatted = formatJSON(
          JSON.stringify(parseToJsonEditor(functions))
        );
        setValue(formatted);
      });
    }
  }, [componentId, fn, name]);

  const handleValueChange = (newValue: string) => {
    try {
      const formatted = formatJSON(newValue);
      setValue(formatted);
      setResultValue("");
      setError(null);
    } catch {
      setError("Invalid JSON format. Please correct it.");
    }
  };

  const onInvoke = async () => {
    try {
      const sanitizedValue = sanitizeInput(value);
      const parsedValue = JSON.parse(sanitizedValue);
      const apiData = parseToApiPayload(parsedValue, functionDetails);
      const functionName = `${encodeURIComponent(
        name || ""
      )}.${encodeURIComponent(`{${fn}}`)}`;
      const response = await API.invokeWorkerAwait(
        componentId,
        workerName,
        functionName,
        apiData
      );

      const formattedResponse = formatJSON(
        JSON.stringify(response?.result?.value)
      );
      setResultValue(formattedResponse);
    } catch {
      setError("Invalid JSON data. Please correct it before invoking.");
    }
  };

  const copyToClipboard = () => navigator.clipboard.writeText(value);

  return (
    <ErrorBoundary>
      <div className="flex">
        <WorkerLeftNav />
        <div className="flex-1 flex flex-col bg-background">
          <header className="w-full border-b py-4 px-6">
            <h1 className="text-2xl font-semibold text-foreground truncate">
              {workerName}
            </h1>
          </header>
          <header className="w-full border-b py-4 px-6">
            <h3 className="">
              {name} - {fn}
            </h3>
          </header>
          <div className="p-10 space-y-6 mx-auto overflow-scroll h-[90vh] min-w-[60%]">
            <main className="flex-1 overflow-y-auto p-6 space-y-6">
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
        <div className="flex items-center gap-40">
          <div>
            <CardTitle className="text-xl font-bold">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {copyToClipboard && (
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <ClipboardCopy className="h-4 w-4" />
              Copy
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!readOnly ? (
          <Textarea
            value={value}
            onChange={(e) => onValueChange?.(e.target.value)}
            className={cn(
              "min-h-[200px] font-mono text-sm",
              error && "border-red-500"
            )}
            placeholder="Enter JSON data..."
          />
        ) : (
          <ReactJson
            src={JSON.parse(value || "{}")}
            name={null}
            theme="rjv-default"
            collapsed={false}
            enableClipboard={false}
            displayDataTypes={false}
            style={{ fontSize: "14px", lineHeight: "1.6" }}
          />
        )}
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </CardContent>
    </Card>
  );
}
