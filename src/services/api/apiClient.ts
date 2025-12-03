import axios  from 'axios';
// import { type AxiosResponse } from 'axios';
// import type { ApiResponse } from '../../types/api';
import { ENV } from '../../utils/environment/env';
// import { ApiCode } from '../../types/api';

// import type { Camera, CreateCameraPayload } from '../../types/camera';

const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// apiClient.interceptors.response.use(
//   (response: AxiosResponse<ApiResponse<any>>) => {
//     const apiResponse = response.data

//     if (apiResponse.code == ApiCode.SUCCESS) {
//       return apiResponse.data
//     }

//     return Promise.reject(new Error(apiResponse.message || "Undefine Error"))
//   },
//   (error) => {
//     let errorMessage = "An Error Occur";

//     if (error.response) {
//       const serverError = error.response.data as ApiResponse<null>;
//       if (serverError && serverError.message) {
//         errorMessage = serverError.message;
//       } else {
//         errorMessage = `Error ${error.response.status}: ${error.response.statusText}`
//       }
//     } else if (error.request) {
//       errorMessage = "Not Respond from server"
//     } else {
//       errorMessage = error.message;
//     }
//     return Promise.reject(new Error(errorMessage))

//   }
// )

export default apiClient;