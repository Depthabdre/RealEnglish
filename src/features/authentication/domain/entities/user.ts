export class User {
    constructor(
        public readonly id: string,
        public readonly fullName: string,
        public readonly email: string,
        public readonly password?: string // Password is optional here as it shouldn't always be exposed
    ) { }
}