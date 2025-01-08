/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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

export enum Tools {
    cloudTaskTestTool = "cloudTaskTestTool",
    cloudTaskCreateTask = "cloudTaskCreateTask",
    cloudTaskCurrentDateTime = "cloudTaskCurrentDateTime",
    cloudTaskConvertTimeToEpoch = "cloudTaskConvertTimeToEpoch",
}

export function CloudTask(options: CloudTaskPluginOptions): GenkitPlugin {
    const taskClient = new CloudTasksClient();
    return genkitPlugin('cloudTask', async (ai:Genkit) => {

        ai.defineTool(
            {
                name: Tools.cloudTaskTestTool,
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
                name: Tools.cloudTaskCreateTask,
                description: 'Creates a task based on the users request that can be asynchronously executed in the future.',
                inputSchema: z.object({
                    task: task,
                }),
            outputSchema: z.string(),
            },
            async (input): Promise<string> => {
                const parent =`projects/${options.projectId}/locations/${options.region}/queues/${options.queueName}`;
                const result = await taskClient.createTask({
                    parent: parent,
                    task:{
                        scheduleTime: {seconds: input.task.scheduledTime},
                        httpRequest: {
                            url: options.defaultHttpEndpoint,
                            headers: {'Content-Type': 'application/json'},
                            httpMethod: 'POST',
                            body: Buffer.from(JSON.stringify({data: {prompt: input.task.prompt}})).toString('base64'),
                        }
                }})
                const outName = result[0].name;
                let name = "could not determine name";
                if (outName) {
                  name = outName.replace(`${parent}/tasks`, "");
                }
                return name;
            }
        );
        
        ai.defineTool(
          {
            name: Tools.cloudTaskCurrentDateTime,
            description: 'This returns the current date and time in a string format',
            inputSchema: z.void(),
            outputSchema: z.string(),
          },
          async (input) => {
            return new Date().toString();
          }
        );
        
        ai.defineTool(
          {
            name: Tools.cloudTaskConvertTimeToEpoch,
            description: 'Convert the time string into epoch time in seconds',
            inputSchema: z.string(),
            outputSchema: z.string(),
          },
          async (input) => {
            return ((new Date(input).getTime())/1000).toString();
          }
        )
    });
}