import { JRPCError, Json } from "../interfaces";
import { errorCodes, errorValues } from "./error-constants";

const FALLBACK_ERROR_CODE = errorCodes.rpc.internal;
const FALLBACK_MESSAGE = "Unspecified error message. This is a bug, please report it.";

export const JSON_RPC_SERVER_ERROR_MESSAGE = "Unspecified server error.";
declare type PropertyKey = string | number | symbol;

type ErrorValueKey = keyof typeof errorValues;

/**
 * Returns whether the given code is valid.
 * A code is valid if it is an integer.
 *
 * @param code - The error code.
 * @returns Whether the given code is valid.
 */
export function isValidCode(code: unknown): code is number {
  return Number.isInteger(code);
}

export function isValidString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * A type guard for {@link RuntimeObject}.
 *
 * @param value - The value to check.
 * @returns Whether the specified value has a runtime type of `object` and is
 * neither `null` nor an `Array`.
 */
export function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Check if the value is plain object.
 *
 * @param value - Value to be checked.
 * @returns True if an object is the plain JavaScript object,
 * false if the object is not plain (e.g. function).
 */
export function isPlainObject(value: unknown) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  try {
    let proto = value;
    while (Object.getPrototypeOf(proto) !== null) {
      proto = Object.getPrototypeOf(proto);
    }
    return Object.getPrototypeOf(value) === proto;
  } catch (_) {
    return false;
  }
}

/**
 * Check if the given code is a valid JSON-RPC server error code.
 *
 * @param code - The error code.
 * @returns Whether the given code is a valid JSON-RPC server error code.
 */
function isJsonRpcServerError(code: number): boolean {
  return code >= -32099 && code <= -32000;
}

function isJsonRpcError(value: unknown): value is JRPCError {
  const castValue = value as JRPCError;
  if (!castValue) return false;
  if (!isValidCode(castValue.code) || !isValidString(castValue.message)) return false;
  if (castValue.stack && !isValidString(castValue.stack)) return false;
  return true;
}

/**
 * Gets the message for a given code, or a fallback message if the code has
 * no corresponding message.
 *
 * @param code - The error code.
 * @param fallbackMessage - The fallback message to use if the code has no
 * corresponding message.
 * @returns The message for the given code, or the fallback message if the code
 * has no corresponding message.
 */
export function getMessageFromCode(code: unknown, fallbackMessage: string = FALLBACK_MESSAGE): string {
  if (isValidCode(code)) {
    const codeString = code.toString();

    if (Object.hasOwn(errorValues, codeString)) {
      return errorValues[codeString as ErrorValueKey].message;
    }

    if (isJsonRpcServerError(code)) {
      return JSON_RPC_SERVER_ERROR_MESSAGE;
    }
  }
  return fallbackMessage;
}

const FALLBACK_ERROR: JRPCError = {
  code: FALLBACK_ERROR_CODE,
  message: getMessageFromCode(FALLBACK_ERROR_CODE),
};

function isValidJson(str: unknown): boolean {
  try {
    JSON.parse(
      JSON.stringify(str, (strKey, strVal) => {
        if (strKey === "__proto__" || strKey === "constructor") {
          throw new Error("Not valid json");
        }
        if (typeof strVal === "function" || typeof strVal === "symbol") {
          throw new Error("Not valid json");
        }
        return strVal;
      }),
      (propKey, propValue) => {
        // Strip __proto__ and constructor properties to prevent prototype pollution.
        if (propKey === "__proto__" || propKey === "constructor") {
          return undefined;
        }
        return propValue;
      }
    );
    // this means, it's a valid json so far
  } catch (e) {
    return false;
  }
  return true;
}

/**
 * Extracts all JSON-serializable properties from an object.
 *
 * @param object - The object in question.
 * @returns An object containing all the JSON-serializable properties.
 */
function serializeObject(object: Record<PropertyKey, unknown>): Json {
  return Object.getOwnPropertyNames(object).reduce<Record<string, Json>>((acc, key) => {
    const value = object[key];
    if (isValidJson(value)) {
      acc[key] = value as Json;
    }

    return acc;
  }, {});
}

/**
 * Serializes an unknown error to be used as the `cause` in a fallback error.
 *
 * @param error - The unknown error.
 * @returns A JSON-serializable object containing as much information about the original error as possible.
 */
export function serializeCause(error: unknown): Json {
  if (Array.isArray(error)) {
    return error.map((entry) => {
      if (isValidJson(entry)) {
        return entry;
      } else if (isObject(entry)) {
        return serializeObject(entry);
      }
      return null;
    });
  } else if (isObject(error)) {
    return serializeObject(error as Record<PropertyKey, unknown>);
  }

  if (isValidJson(error)) {
    return error as Json;
  }

  return null;
}

/**
 * Construct a JSON-serializable object given an error and a JSON serializable `fallbackError`
 *
 * @param error - The error in question.
 * @param fallbackError - A JSON serializable fallback error.
 * @returns A JSON serializable error object.
 */
function buildError(error: unknown, fallbackError: JRPCError): JRPCError {
  // If an error specifies a `serialize` function, we call it and return the result.
  if (error && typeof error === "object" && "serialize" in error && typeof error.serialize === "function") {
    return error.serialize();
  }

  if (isJsonRpcError(error)) {
    return error as JRPCError;
  }

  // If the error does not match the JsonRpcError type, use the fallback error, but try to include the original error as `cause`.
  const cause = serializeCause(error);
  const fallbackWithCause = {
    ...fallbackError,
    data: { cause },
  };

  return fallbackWithCause;
}

/**
 * Serializes the given error to an Ethereum JSON RPC-compatible error object.
 * If the given error is not fully compatible, it will be preserved on the
 * returned object's data.cause property.
 *
 * @param error - The error to serialize.
 * @param options - Options bag.
 * @param options.fallbackError - The error to return if the given error is
 * not compatible. Should be a JSON serializable value.
 * @param options.shouldIncludeStack - Whether to include the error's stack
 * on the returned object.
 * @returns The serialized error.
 */
export function serializeError(error: unknown, { fallbackError = FALLBACK_ERROR, shouldIncludeStack = true } = {}): JRPCError {
  if (!isJsonRpcError(fallbackError)) {
    throw new Error("Must provide fallback error with integer number code and string message.");
  }

  const serialized = buildError(error, fallbackError);

  if (!shouldIncludeStack) {
    delete serialized.stack;
  }

  return serialized;
}

/**
 * Returns true if supplied error data has a usable `cause` property; false otherwise.
 *
 * @param data - Optional data to validate.
 * @returns Whether cause property is present and an object.
 */
export function dataHasCause(data: unknown): data is {
  [key: string]: Json | unknown;
  cause: object;
} {
  return isObject(data) && Object.hasOwn(data, "cause") && isObject(data.cause);
}
