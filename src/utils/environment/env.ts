function getEnvVar(key: keyof ImportMetaEnv): string {
    const value = import.meta.env[key];

    if (value === undefined || value === null) {
        throw new Error(`Environment key ${key} is not set.`)
    }

    return value;
}

export const ENV = {
    API_BASE_URL: getEnvVar('VITE_API_BASE_URL'),
    APP_TITLE: import.meta.env.VITE_APP_TITLE || "React App"
}