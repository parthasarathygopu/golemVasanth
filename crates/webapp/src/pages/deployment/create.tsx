import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import ErrorBoundary from "@/components/errorBoundary";
import { API } from "@/service";
import { useNavigate } from "react-router-dom";

const formSchema = z.object({
  domain: z.string().min(1, "Domain is required"),
  definitions: z
    .array(
      z.object({
        id: z.string().min(1, "Definition is required"),
        version: z.string().min(1, "Version is required"),
      })
    )
    .min(1, "At least one API definition is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateDeployment() {
  const [apiDefinitions, setApiDefinitions] = useState<
    { id: string; versions: string[] }[]
  >([]);
  const navigate = useNavigate();

  const [availableVersions, setAvailableVersions] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      domain: "",
      definitions: [{ id: "", version: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "definitions",
  });

  useEffect(() => {
    API.getApiList().then((response) => {
      const transformedData = Object.values(
        response.reduce((acc, api) => {
          if (!acc[api.id]) {
            acc[api.id] = { id: api.id, versions: [] };
          }
          acc[api.id].versions.push(api.version);
          return acc;
        }, {} as Record<string, { id: string; versions: string[] }>)
      );
      setApiDefinitions(transformedData);
    });
  }, []);

  function onSubmit(data: FormValues) {
    const payload = {
      site: {
        host: data.domain,
        subdomain: null,
      },
      apiDefinitions: data.definitions,
    };
    API.createDeployment(payload).then(() => {
      navigate("/deployments");
    });
  }

  return (
    <ErrorBoundary>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="space-y-2 mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Deploy API</h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Domain
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Enter domain" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-base font-medium">API Definitions</h2>
                  <p className="text-sm text-muted-foreground">
                    Include one or more API definitions to deploy
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ id: "", version: "" })}
                >
                  Add
                </Button>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid gap-4 items-start md:grid-cols-[1fr,1fr,auto]"
                  >
                    <FormField
                      control={form.control}
                      name={`definitions.${index}.id`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Definition
                          </FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue(`definitions.${index}.version`, "");
                              const versions =
                                apiDefinitions.find((api) => api.id === value)
                                  ?.versions || [];
                              setAvailableVersions(versions);
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select definition" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {apiDefinitions.map((api) => (
                                <SelectItem key={api.id} value={api.id}>
                                  {api.id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`definitions.${index}.version`}
                      render={({ field }) => {
                        return (
                          <FormItem>
                            <FormLabel className="text-base font-medium">
                              Version
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select version" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableVersions.map((version) => (
                                  <SelectItem key={version} value={version}>
                                    {version}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={fields.length === 1}
                      className="mt-8 bg-destructive/20 hover:bg-destructive/50"
                      onClick={() => remove(index)}
                    >
                      <X />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit">Deploy</Button>
            </div>
          </form>
        </Form>
      </div>
    </ErrorBoundary>
  );
}
