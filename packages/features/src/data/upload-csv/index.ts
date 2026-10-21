import { Submodel } from "foldkit"
import { view as contentView } from "./app.view.ts"
import type { Message as CsvUploadMessage } from "./app.message.ts"
import type { Model as CsvUploadModel } from "./app.model.ts"

export { Model, type Model as ModelType } from "./app.model.ts"
export {
    LoadedUploadPreview,
    FailedUploadPreview,
    DeletedUpload,
    DeleteUploadFailed,
    ImportedUpload,
    ImportUploadFailed,
    LoadedUploads,
    FailedLoadingUploads,
    Message,
    UploadedCsv,
    ClickedUploadCsv,
    UploadCsvFailed,
    type Message as MessageType,
} from "./app.message.ts"
export {
    init,
    initDeferred,
    parseCsv,
    update,
} from "./app.update.ts"

export const view = Submodel.defineView<CsvUploadModel, CsvUploadMessage>(
    contentView
)
