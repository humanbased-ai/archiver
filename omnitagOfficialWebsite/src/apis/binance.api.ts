import axios, { AxiosInstance } from "axios";

const request = axios.create({
  baseURL: "https://app.codatta.io/api",
  timeout: 60000,
});

interface Response<T> {
  data: T;
  errorCode: number;
  errorMessage: string;
  success: boolean;
}

class CommonApi {
  constructor(private request: AxiosInstance) {}

  async getBinanceContributors(page: number, page_size: number) {
    const res = await this.request.post<Response<string[]>>("/v2/binance/v1/contributors", {
      page,
      page_size,
    });
    return res.data;
  }
}

export default new CommonApi(request);
