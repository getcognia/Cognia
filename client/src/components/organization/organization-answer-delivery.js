export function getOrganizationAnswerDeliveryMode(options = {}) {
  const supportsStreaming =
    options.supportsStreaming ?? typeof EventSource !== "undefined"

  if (supportsStreaming) {
    return {
      mode: "stream",
      shouldPoll: false,
    }
  }

  return {
    mode: "poll",
    shouldPoll: true,
  }
}
