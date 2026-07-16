import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { createProductsWorkflow } from "@medusajs/medusa/core-flows";

export const syncProductWorkflow = createWorkflow("sync-product", (input: any) => {
    // 1. Can add steps here to transform AI-generated data
    // 2. Call the core Medusa workflow to create the product
    const products = createProductsWorkflow.runAsStep({
        input: input,
    });

    return new WorkflowResponse(products);
});

