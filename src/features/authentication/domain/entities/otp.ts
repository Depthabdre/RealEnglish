export class OTP {
    constructor(
        public readonly email: string,
        public readonly resetToken: string
    ) { }
}