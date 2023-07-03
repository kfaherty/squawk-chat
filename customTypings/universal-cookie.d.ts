declare module "universal-cookie" {
  class Cookies {
    constructor();
    getAll(): Object;
    set(key: string, data: object, params: Object): void;
    remove(key: string): void;
  }
}
