/**
 * # Chat Service
 *
 * API interface implemented by web, native, or test layers
 */
import { Message, SendMessageRequest } from "@urm/domain/schemas/chat"

export interface MessagesApi {
    list(params?: { after?: number }): Promise<Message[]>

    send(data: SendMessageRequest): Promise<{ item: Message; txid: number }>
}
