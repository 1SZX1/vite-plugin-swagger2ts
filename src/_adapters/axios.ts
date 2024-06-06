import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { Get, mergeUrlParam } from './utils'

function axiosAdapter<T extends Record<string, any> /**类型集合 */, AxiosRes = true/**返回类型是否包含Response */>(httpInstance: AxiosInstance) {
  type UrlKey = keyof T
  type MethodKey<U extends UrlKey> = string & keyof T[U]

  type SwaggerInterfaceSingle<U extends UrlKey, M extends MethodKey<U>> = T[U][M]
  type SwaggerField<U extends UrlKey, M extends MethodKey<U>> = keyof SwaggerInterfaceSingle<U, M>
  type SwaggerFieldType<U extends UrlKey, M extends MethodKey<U>, F extends SwaggerField<U, M>> = SwaggerInterfaceSingle<U, M>[F]

  type Param<U extends UrlKey, M extends MethodKey<U>> = SwaggerFieldType<U, M, 'param' & SwaggerField<U, M>>
  type Response<U extends UrlKey, M extends MethodKey<U>> = SwaggerFieldType<U, M, 'response' & SwaggerField<U, M>>

  async function request<U extends UrlKey, M extends MethodKey<U>>(
    url: U & string, method: M,
    param?: Get<Param<U, M>, M extends 'get' ? 'query' : 'body'>,
    config?: AxiosRequestConfig & {
      data?: Get<Param<U, M>, 'body'>
      params?: Get<Param<U, M>, 'query'>
      path?: Get<Param<U, M>, 'path'>
    },
  ) {
    if (config?.path)
      (url as string) = mergeUrlParam(url, config.path)

    type Res = Response<U, M>
    const response = await httpInstance.request<any, AxiosRes extends true ? AxiosResponse<Res> : Res>({
      url,
      method,
      params: method === 'get' ? param : config?.params,
      data: method !== 'get' ? param : config?.data,
      ...config,
    })
    return response
  }

  return { request }
}


export { axiosAdapter }
