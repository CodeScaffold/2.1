import mongoose, { Schema, Document, Model } from "mongoose";
import moment from "moment-timezone";

interface ILog extends Document {
  userId: string;
  action: string;
  timestamp: Date;
  details: string;
}

const logSchema: Schema = new Schema({
  userId: { type: String, required: true },
  action: { type: String, required: true },
  timestamp: {
    type: Date,
    default: () => moment().tz("Europe/Istanbul").toDate(), // Use Europe/Istanbul
  },
  details: { type: String, required: true },
  additionalInfo: { type: Schema.Types.Mixed },
});

// Create a model.
const Log: Model<ILog> = mongoose.model<ILog>("Log", logSchema);

export { Log, ILog };
