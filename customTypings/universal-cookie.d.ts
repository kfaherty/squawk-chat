declare module 'universal-cookie' {
  class Cookies {
    getAll(): Object;
    set(key: string, data: object, params: Object): void;
    remove(key: string): void;
  }
}