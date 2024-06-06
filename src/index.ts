import { writeFileSync, readFileSync } from "fs";
import { relative, resolve } from "path";
import { convertObj } from "swagger2openapi";
import { OpenAPIObject } from "openapi3-ts";
import chalk from 'chalk'
import { format } from 'prettier'
import { UserOptions, SwaggerSource, SwaggerDoc, ExportPlugin, ResolvedOptions } from "./types";
import { resolveOptions, fetchUrl } from "./utils";
import { generateDocs, generatorMethodType, getApiName, getPathsName } from "./generator";
import { CODE_PREFIX, pluginName } from "./config";

async function loadSwaggerSource(options: ResolvedOptions) {
    const { swaggerUrl, jsonUrl, jsonPath, jsonLoader, output, formatDocs, formatSchema } = options;

    async function genInterface(docs: SwaggerDoc | OpenAPIObject, docsName: string) {
        docs = formatDocs ? formatDocs(docs) : docs;
        if (!("openapi" in docs)) {
            if (docs.swagger)
                docs = (await convertObj(docs, { patch: true })).openapi as OpenAPIObject;
            else
                throw new Error(JSON.stringify(docs))
        }
        const res = generateDocs(docs, { docsName, baseUrl: docs.basePath ?? "", formatSchema });
        console.log(chalk.green(`[${pluginName}]: ${docsName} success`))
        return res
    }

    async function genResourcesCode(source: SwaggerSource) {
        const { url, name } = source;
        try {
            const docs = await fetchUrl(`${swaggerUrl}${url}`)
            const code = await genInterface(docs, name)
            return code
        } catch (error) {
            console.log(chalk.yellow(`[${pluginName}]: ${name} error;`) + (error as Error).message)
            return ''
        }
    }

    async function getSources() {
        const sources: Pick<SwaggerSource, 'name'>[] = []
        const interfaces: string[] = []

        async function loadSwaggerJson(swaggerJson: OpenAPIObject) {
            if (swaggerJson.info) {
                const name = getApiName(swaggerJson)
                interfaces.push(await genInterface(swaggerJson, name))
                sources.push({ name })
            } else {
                console.log(chalk.yellow(`[${pluginName}]: jsonUrl error;`) + JSON.stringify(swaggerJson))
            }
        }

        if (typeof swaggerUrl === 'string') {
            const resources = (await fetchUrl(`${swaggerUrl}/swagger-resources;`).catch((error) => error));
            if (Array.isArray(resources)) {
                sources.push(...resources)
                interfaces.push(...(await Promise.all(resources.map(genResourcesCode))))
            } else {
                console.log(chalk.yellow(`[${pluginName}]: resources error`) + JSON.stringify(resources))
            }
        }

        if (typeof jsonUrl === 'string') {
            const swaggerJson: OpenAPIObject = await fetchUrl(jsonUrl)
            await loadSwaggerJson(swaggerJson)
        }

        if (jsonLoader)
            await loadSwaggerJson(await jsonLoader())

        if (typeof jsonPath === 'string') {
            const _jsonPath = resolve(process.cwd(), jsonPath)
            const swaggerJson: OpenAPIObject = JSON.parse(readFileSync(_jsonPath, { encoding: 'utf-8' }))

            await loadSwaggerJson(swaggerJson)
        }

        return { sources, interfaces }
    }
    const { sources, interfaces } = await getSources()
    
    if (!interfaces.length) return
    const code = interfaces.reduce((a, b) => a + b, '')
    const suffix = interfaces.reduce((a, b, index) => {
        if (b) {
            a += !a ? `export type ${getPathsName('_Intersection')} = ` : `&`
            const { name } = sources[index]
            a += name ? getPathsName(name) : 'any'
        }
        return a
    }, '')

    const outputFile = resolve(process.cwd(), output);
    writeFileSync(outputFile, CODE_PREFIX + await format(code + suffix, { parser: 'typescript' }));

    return { sources, interfaces }
}

async function loadGlobTypes({ glob, output }: ResolvedOptions) {
    if (!glob) return

    const outputFile = resolve(process.cwd(), glob.output || 'auto-types.d.ts')
    const importPath = relative(outputFile, output).replaceAll('\\', '/').replace(/^\.\.\//, './')
    const intersection = getPathsName('_Intersection')

    const code = `import { ${intersection} } from '${importPath}'

type FilterOptional<Source, Condition> = Pick<
  Source,
  {
    [K in keyof Source]: Source[K] extends Condition ? K : never;
  }[keyof Source]
>

declare global {
  export namespace ${glob.namespace} {
    ${generatorMethodType(intersection)}
  }
}`
    writeFileSync(outputFile, await format(CODE_PREFIX + code, { parser: 'typescript' }));
}

function swagger2TsPlugin(userOptions?: UserOptions): ExportPlugin {

    (async () => {
        const options = await resolveOptions(userOptions)
        await Promise.all(options.map(loadSwaggerSource))
        await Promise.all(options.map(loadGlobTypes))
    })()

    return {
        name: `${pluginName}`,
        enforce: "pre",
        apply: "serve"
    };
}

export function defineConfig(userOptions?: UserOptions) {
    return userOptions
}

export * from "./types";
export default swagger2TsPlugin;
