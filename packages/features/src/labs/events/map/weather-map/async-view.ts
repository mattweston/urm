export type AsyncView<A> = Readonly<{
    value: A | undefined
    failure: string | undefined
    is_waiting: boolean
}>
