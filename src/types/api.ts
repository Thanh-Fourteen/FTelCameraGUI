export interface ApiResponse<T> {
    data: T;
    code: string;
    message: string;
}

export const ApiCode = {
    SUCCESS: 'OPERATION_SUCCESS',
    ERROR: 'OPERATION_ERROR',
}