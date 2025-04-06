import { Journal, JournalOptions } from "@ferment-ai/journal";
import { RuntimeModule } from "@ferment-ai/runtime-common";
import { RootConstruct } from "constructs";


export const virtualModelFactory = async (rootConstruct: RootConstruct, modules: RuntimeModule[], journalProps: JournalOptions): Promise<Journal> => {

    const journal = new Journal(journalProps ?? {});

    // Bind journal listeners for each module
    for (const module of modules.values()) {
        console.log("Initializing module", module.id);
        await module.initialize(rootConstruct, journal);
    }

    // TODO: validate that all constructs are marked as bound.

    return journal;
}