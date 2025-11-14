export class Choice {
    constructor(
        public readonly id: string,
        public readonly text: string,
        public readonly imageUrl?: string | null
    ) { }
}