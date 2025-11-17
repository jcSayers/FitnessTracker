declare module '@garmin/fitsdk' {
  export class Decoder {
    constructor(stream: Stream);
    static isFIT(stream: Stream): boolean;
    isFIT(): boolean;
    checkIntegrity(): boolean;
    read(options?: DecoderOptions): { messages: Record<string, any[]>; errors: string[] };
  }

  export class Stream {
    static fromByteArray(bytes: number[]): Stream;
    static fromArrayBuffer(buffer: ArrayBuffer): Stream;
    static fromBuffer(buffer: Buffer): Stream;
  }

  export class Profile {
    static types: {
      mesgNum: Record<string, string>;
    };
    static MesgNum: Record<string, number>;
  }

  export class Utils {
    static readonly FIT_EPOCH_MS: number;
    static convertDateTimeToDate(fitDateTime: number): Date;
  }

  export class Encoder {
    onMesg(mesgNum: number, message: Record<string, any>): void;
    writeMesg(message: Record<string, any>): void;
    close(): Uint8Array;
  }

  interface DecoderOptions {
    mesgListener?: (messageNumber: number, message: any) => void;
    mesgDefinitionListener?: (mesgDefinition: any) => void;
    fieldDescriptionListener?: (key: string, developerDataIdMesg: any, fieldDescriptionMesg: any) => void;
    applyScaleAndOffset?: boolean;
    expandSubFields?: boolean;
    expandComponents?: boolean;
    convertTypesToStrings?: boolean;
    convertDateTimesToDates?: boolean;
    includeUnknownData?: boolean;
    mergeHeartRates?: boolean;
  }
}
