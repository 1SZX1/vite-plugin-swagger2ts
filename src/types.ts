import type { OpenAPIObject, SchemaObject } from "openapi3-ts";
import type { Plugin } from "vite";

type FormatSchema = (schema: SchemaObject) => SchemaObject;

export interface Options {
    /**
     * 文档域名地址
     */
    swaggerUrl?: string;
    /**
     * 文档json地址
     */
    jsonUrl?: string;
    /**
     * openApi 本地json
     */
    jsonPath?: string;
    /**
     * 加载json的方法
     */
    jsonLoader?: () => OpenAPIObject | Promise<OpenAPIObject>;

    output?: string;
    formatDocs?: (docs: SwaggerDoc | OpenAPIObject) => typeof docs;
    formatSchema?: FormatSchema;

    glob?: {
        namespace: string,
        output?: string,
    }
}

export type UserOptions = Options | { sources: Options[] };
export interface ResolvedOptions extends Options {
    output: string;
}

export type ExportPlugin = Plugin

export interface SwaggerSource {
    name: string;
    url: string;
    swaggerVersion: string;
    location: string;
}

export interface SwaggerDoc {
    basePath: string;
    swagger: string;
    paths: { [key: string]: any };
    definitions: { [key: string]: any };
    host: string;
    info: any;
    tags: any[];
    securityDefinitions: any;
}

export interface GenerateDocOption {
    docsName: string;
    baseUrl: string;
    formatSchema?: FormatSchema;
}
