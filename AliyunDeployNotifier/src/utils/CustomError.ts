export class CustomError extends Error {
  statusCode: number;
  chat_id?: string;

  constructor(message: string, statusCode: number, chat_id?: string) {
    super(message);
    this.statusCode = statusCode;
    this.chat_id = chat_id;
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}
