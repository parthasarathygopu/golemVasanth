/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentExportFunction, Field, Typ } from "@/types/component.ts";

export const parseToJsonEditor = (data: ComponentExportFunction) => {
  const toShow = data.parameters.map((param) => {
    return processPayload(param);
  });

  return toShow;
};

export const processPayload = (field: Field) => {
  if (field.typ.type === "Str") {
    return "";
  } else if (field.typ.type === "Record") {
    const recordFields = {} as any;
    field.typ.fields?.forEach((field: any) => {
      recordFields[field.name] = processPayload(field);
    });
    return recordFields;
  } else if (["U32", "F32", "I32"].indexOf(field.typ.type)) {
    return 0;
  }
  return null;
};

export const parseToApiPayload = (
  input: any[],
  actionDefinition: ComponentExportFunction
) => {
  const payload = {
    params: [],
  } as any;
  const parseValue = (input: any[], typeDef: Typ) => {
    if (typeDef.type === "Str") {
      return input[0];
    } else if (typeDef.type === "Record") {
      return input[0];
    } else if (typeDef.type === "Tuple") {
      return input[0];
    } else if (typeDef.type === "List") {
      return input;
    } else if (typeDef.type === "U32" || typeDef.type === "F32") {
      return input[0];
    } else {
      throw new Error(`Unsupported type: ${typeDef.type}`);
    }
  };

  // Parse input based on action definition parameters
  actionDefinition.parameters.forEach((param, index) => {
    const value = parseValue(input[index] ? [input[index]] : input, param.typ);
    payload.params.push({
      value,
      typ: param.typ,
    });
  });

  return payload;
};

export function formatJSON(input: string): string {
  try {
    return JSON.stringify(JSON.parse(input), null, 2);
  } catch {
    return input;
  }
}
