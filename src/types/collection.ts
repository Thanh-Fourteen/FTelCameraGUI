export interface CreateCollectionPayload {
    name: string;
    vector_size: number;
    distance: string;
    id_type: string;
}