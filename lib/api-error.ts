import { APICallError } from "ai";

export function providerErrorMessage(error: unknown) {
  if (APICallError.isInstance(error)) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return "The model provider rejected the API key. Check your provider settings.";
    }
    if (error.statusCode === 404) {
      return "This model is unavailable for your account. Select another model.";
    }
    if (error.statusCode === 429) {
      return "The model provider's rate or spending limit was reached. Try again later.";
    }
    if (error.statusCode === 400) {
      return "The model provider rejected the request. Check your model settings.";
    }
  }
  return "The model provider could not complete the request. Please try again.";
}
