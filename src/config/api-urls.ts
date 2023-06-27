export const useProd: boolean = true;

export const prodSocketUrl: string = "";
export const devSocketUrl: string = "";

const baseUrl: string = useProd ? "" : "";

export const loginUrl: string = `${baseUrl}/`;
export const noteUrl: string = `${baseUrl}/`;
export const avatarUrl: string = `${baseUrl}/`;
export const characterUrl: string = `${baseUrl}/c/`;
export const eiconUrl: string = `${baseUrl}/`;
export const profileUrl: string = `${baseUrl}/`;

export const version: string = "2.0.1";
