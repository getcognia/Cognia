export declare function getOrganizationAnswerDeliveryMode(options?: {
  supportsStreaming?: boolean
}): {
  mode: "stream" | "poll"
  shouldPoll: boolean
}
