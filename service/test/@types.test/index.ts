declare module 'chai-as-promised' {
  global {
    namespace Chai {
      interface Eventually {
        rejectWith: PromisedThrow
      }
    }
  }
}