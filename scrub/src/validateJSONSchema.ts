import Ajv from "https://cdn.skypack.dev/ajv";
import addFormats from "https://cdn.skypack.dev/ajv-formats";

export const schemaPodcast = {
  type: "object",
  properties: {
    "__type": { type: "string" },
    "__sourceType": { type: "string" },
    "__user": { type: "string" },
    "__stamp": {
      type: "string",
      format: "date-time",
      // formatMinimum: "2016-02-06",
      // formatExclusiveMaximum: "2016-12-27",
    },
    "uuid": { type: "string", format: "uuid" },
    "id": { type: "integer" },
    "url": {
      type: "string",
      //  format: "uri", // some are not actually uri's
      nullable: true,
    },
    "title": { type: "string" },
    "description": { type: "string", nullable: true },
    "thumbnail_url": {
      type: "string",
      // format: "uri", // hmm..
      nullable: true,
    },
    "author": { type: "string", nullable: true },
    "episodes_sort_order": { type: "integer" },
    "autoSkipLast": { type: "integer" },
  },
  required: [
    "__type",
    "__sourceType",
    "__user",
    "__stamp",
    "uuid",
    // "id", // a few are missing
    "url",
    "title",
    "description",
    // "thumbnail_url", // many missing after 2018-12-31
    "author",
    // "episodes_sort_order", // not always present
    // "autoSkipLast", // not always present, appears after 2020-02-17
  ],
  additionalProperties: false,
};

export function validatorForPodcast() { // : (data: any) => boolean {
  const ajv = new Ajv({
    // allErrors: true,
    // jsonPointers: true,
    // removeAdditional: true,
    // useDefaults: true,
    // verbose: true,
  }); // options can be passed, e.g. {allErrors: true}
  addFormats(ajv);
  const validatorFunction = ajv.compile(schemaPodcast);
  return validatorFunction;
}

export const schemaEpisode = {
  type: "object",
  properties: {
    "__type": { type: "string" },
    "__sourceType": { type: "string" },
    "__user": { type: "string" },
    "__stamp": {
      type: "string",
      format: "date-time",
    },
    "uuid": { type: "string", format: "uuid" },
    "podcast_uuid": { type: "string", format: "uuid" },
    "id": { type: "integer", nullable: true },
    "podcast_id": { type: "integer", nullable: true },
    "url": {
      type: "string",
      //  format: "uri", // some are not actually uri's
      nullable: true,
    },
    "duration": { // could be dune with coerceTypes: true
      anyOf: [{
        type: "integer",
        minimum: 0,
      }, {
        type: "string",
        format: "int32",
      }, {
        type: "null", // == nullable: true,
      }],
    },
    "title": { type: "string" },
    "size": { // could be dune with coerceTypes: true
      anyOf: [{
        type: "integer",
        minimum: 0,
      }, {
        type: "string",
        format: "int32",
      }, {
        type: "null", // == nullable: true,
      }],
    },
    "published_at": {
      type: "string",
      format: "date-time",
    },
    "file_type": { type: "string" },
    "is_video": { enum: [false, true, 0, 1] },

    // below are user specific fields
    "playing_status": { type: "integer", nullable: true },
    "played_up_to": { type: "integer", nullable: true },
    "starred": { enum: [false, true, 0, 1] }, // have never observed a 1
    // "starred": { // use the simpler enum above
    //   anyOf: [{
    //     type: "integer",
    //     minimum: 0,
    //     maximum: 0,
    //   }, {
    //     type: "boolean",
    //   }],
    // },
    "is_deleted": { enum: [false, true, 0, 1] },
  },
  required: [
    "__type",
    "__sourceType",
    "__user",
    "__stamp",
    "uuid",
    "podcast_uuid",
    // "id", // not always present
    // "podcast_id", // not always present
    "url",
    "duration",
    "title",
    "size",
    "published_at",
    // "is_video", // not always present
    "file_type",
    // below are user specific fields
    // "playing_status", // not always present
    // "played_up_to", // not always present
    // "starred", // not always present
    // "is_deleted", // not always present
  ],
  additionalProperties: false,
};

export function validatorForEpisode() { // : (data: any) => boolean {
  const ajv = new Ajv({
    // coerceTypes: true,  // not for now, but this would avoid string|int, and bool crap
    // allErrors: true,
    // jsonPointers: true,
    // removeAdditional: true,
    // useDefaults: true,
    // verbose: true,
  }); // options can be passed, e.g. {allErrors: true}
  addFormats(ajv);
  const validatorFunction = ajv.compile(schemaEpisode);
  return validatorFunction;
}

export function validateJSONSchema(validatorFunction: any, data: any): void {
  const valid = validatorFunction(data);
  if (valid) {
    // console.log("OK");
  } else {
    console.log(data);
    console.log(validatorFunction.errors);
  }
}
