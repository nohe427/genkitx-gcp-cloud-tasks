import { Genkit, z } from 'genkit';
import { GenkitPlugin, genkitPlugin } from 'genkit/plugin';
import {CloudTasksClient} from '@google-cloud/tasks';

export interface CloudTaskPluginOptions {
    projectId: string,
    queueName: string,
    dispatchDeadlineDuration?: string,
    defaultHttpEndpoint: string,
    region: string,
}

export const task = z.object({
    scheduledTime: z.string().describe('Epoch time in seconds when this task should run.'),
    prompt: z.string().describe('The prompt that the user would like to send at a future time.'),
})

export function CloudTask(options: CloudTaskPluginOptions): GenkitPlugin {
    const taskClient = new CloudTasksClient();
    return genkitPlugin('cloudTask', async (ai:Genkit) => {
        ai.defineTool(
            {
                name: 'testTool',
                description: 'run this tool anytime someone wants to run a test',
                inputSchema: z.void(),
                outputSchema: z.void(),
            },
            async () => {
                console.log('this is a test tool used for testing tools');
            }
        );
        ai.defineTool(
            {
                name: 'cloudTaskcreateTask',
                description: 'Creates a task based on the users request that can be asynchronously executed in the future.',
                inputSchema: z.object({
                    task: task,
                }),
            outputSchema: z.string(),
            },
            async (input) => {
                taskClient.createTask({
                    parent: `projects/${options.projectId}/locations/${options.region}/queues/${options.queueName}`,
                    task:{
                        scheduleTime: {seconds: input.task.scheduledTime},
                        httpRequest: {
                            url: options.defaultHttpEndpoint,
                            httpMethod: "POST",
                            body: Buffer.from(JSON.stringify({data: {prompt: input.task.prompt}})).toString('base64'),
                        }
                }})
                return "";
            }
    )
    });
}