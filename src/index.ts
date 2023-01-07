import { writeFileSync } from "fs";
import { resolve } from "path";
import { convertObj } from "swagger2openapi";
import { OpenAPIObject } from "openapi3-ts";
import { doc, format } from "prettier";
import { UserOptions, ExportPlugin, SwaggerSource, SwaggerDoc } from "./types";
import { resolveOptions, fetchUrl, getPrettierOptions } from "./utils";
import { generateDocs } from "./generator";

function convertObjPromise(docs: any): Promise<OpenAPIObject> {
    return new Promise((resolve, reject) => {
        convertObj(docs, { patch: true }, function (err, option) {
            // err && console.log("err", err);
            if (err || !option.openapi) return reject(err);
            resolve(option.openapi);
        });
    });
}

function swagger2TsPlugin(userOptions: UserOptions): ExportPlugin {
    const { swaggerUrl, output, prettierPath, formatDocs, formatSchema } = resolveOptions(userOptions);
    const prettierOptions = getPrettierOptions(prettierPath);

    async function loadSwaggerSource() {
        const sources = (await fetchUrl(`${swaggerUrl}/swagger-resources`)) as SwaggerSource[];
        let code = "";
        for (let i = 0; i < sources.length; i++) {
            const { url, name: docsName } = sources[i];
            try {
                const docs = (await fetchUrl(`${swaggerUrl}${url}`)) as SwaggerDoc | OpenAPIObject;
                let openapiDocs = formatDocs ? formatDocs(docs) : docs;
                if (!("openapi" in openapiDocs)) {
                    if (docs.swagger) openapiDocs = await convertObjPromise(docs);
                    else continue;
                }
                const apistrings = generateDocs(openapiDocs, { docsName, baseUrl: docs.basePath ?? "", formatSchema });
                code += apistrings;
                // console.log("apistrings", apistrings);
            } catch (error) {
                // console.log("vite-plugin-swagger2ts convert error", error);
            }
        }
        const outputFile = resolve(process.cwd(), output);
        writeFileSync(outputFile, format(code, prettierOptions));
    }

    loadSwaggerSource();

    return {
        name: "vite-plugin-swagger2ts",
        enforce: "pre",
        apply: "serve"
    };
}

export * from "./types";
export default swagger2TsPlugin;
