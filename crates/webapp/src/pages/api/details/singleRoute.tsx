import {useParams} from "react-router-dom";
import {useEffect, useState} from "react";
import {Edit, Trash2} from "lucide-react";

import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import ApiLeftNav from "./apiLeftNav.tsx";
import {API} from "@/service";
import {Api} from "@/types/api";
import ErrorBoundary from "@/components/errorBoundary.tsx";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input"

export const ApiRoute = () => {
    const workerNameCode = 'let user: u64 = request.path.user-id;\n"my-worker-${user}"'
    const responseCode = 'let result = golem:component/api.{get-cart-contents}();\n{status: 200u64, body: result}'

    const {apiName} = useParams();
    const [apiDetails, setApiDetails] = useState([] as Api[]);
    const [activeApiDetails, setActiveApiDetails] = useState({} as Api);

    useEffect(() => {
        if (apiName) {
            API.getApi(apiName).then((response) => {
                setApiDetails(response);
                setActiveApiDetails(response[response.length - 1]);
            });
        }
    }, [apiName]);

    return (
        <ErrorBoundary>
            <div className="flex">
                <ApiLeftNav/>
                <div className="flex-1 flex flex-col">
                    <header className="w-full border-b bg-background py-4">
                        <div className="mx-auto px-6 lg:px-8">
                            <div className="flex items-center gap-4">
                                <h1 className="text-xl font-semibold text-foreground truncate">
                                    {apiName}
                                </h1>
                                <div className="flex items-center gap-2">
                                    {activeApiDetails.version && (
                                        <Select
                                            defaultValue={activeApiDetails.version}
                                            onValueChange={(version) => {
                                                const selectedApi = apiDetails.find(
                                                    (api) => api.version === version
                                                );
                                                if (selectedApi) {
                                                    setActiveApiDetails(selectedApi);
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="w-28">
                                                <SelectValue>{activeApiDetails.version}</SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {apiDetails.map((api) => (
                                                    <SelectItem value={api.version} key={api.version}>
                                                        {api.version}{" "}
                                                        {api.draft ? "(Draft)" : "(Published)"}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto h-[80vh] mx-auto p-6 w-full max-w-7xl">
                        <Card>
                            <CardHeader className="border-b border-zinc-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary"
                                               className="bg-emerald-900 text-emerald-200 hover:bg-emerald-900">
                                            GET
                                        </Badge>
                                        <span className="text-sm font-mono">{'/v4/{user-id}/get-cart-contents'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" size="sm">
                                            <Edit className="h-4 w-4 mr-1"/>
                                            Edit
                                        </Button>
                                        <Button variant="destructive" size="sm">
                                            <Trash2 className="h-4 w-4 mr-1"/>
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="space-y-2">
                                    <CardTitle className="text-sm ">Component</CardTitle>
                                    <Input
                                        value="com / v2"
                                        disabled
                                        className="text-sm font-mono"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-sm ">Path</CardTitle>
                                        <Badge variant="outline" className="border-blue-500 text-blue-400">
                                            Parameters
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            value="user-id"
                                            disabled
                                            className=" text-sm font-mono"
                                        />
                                        <Input
                                            value="u64"
                                            disabled
                                            className="text-sm font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-sm ">Response</CardTitle>
                                        <Badge variant="outline" className="border-blue-500 text-blue-400">
                                            Rib
                                        </Badge>
                                    </div>
                                    <div className="bg-zinc-900 p-4 rounded-md border border-zinc-800">
            <pre className="text-sm font-mono text-zinc-300">
              {responseCode}
            </pre>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-sm ">Worker Name</CardTitle>
                                        <Badge variant="outline" className="border-blue-500 text-blue-400">
                                            Rib
                                        </Badge>
                                    </div>
                                    <div className="bg-zinc-900 p-4 rounded-md border border-zinc-800">
            <pre className="text-sm font-mono text-zinc-300">
              {workerNameCode}
            </pre>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </main>
                </div>
            </div>
        </ErrorBoundary>
    );
};
