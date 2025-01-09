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
import { CloudSchedulerClient } from '@google-cloud/scheduler';

export interface CloudTaskPluginOptions {
    projectId: string,
    queueName: string,
    dispatchDeadlineDuration?: string,
    defaultHttpEndpoint: string,
    region: string,
}

export interface CloudSchedulerPluginOptions {
    projectId: string,
    region: string,
    defaultHttpEndpoint: string,
    retryConfig: {
        retryCount?: number,
        maxRetryDuration?: string,
        minBackoffDuration?: string,
        maxBackoffDuration?: string,
        maxDoublings?: number,
    },
}

export const CloudTasksTask = z.object({
    scheduledTime: z.string().describe('Epoch time in seconds when this task should run.'),
    prompt: z.string().describe('The prompt that the user would like to send to the task. This is created from the original request'),
}).describe('The required inputs for the task which includes when the task needs to occur and the prompt that the user would like to send in the task.')

export const CloudTasksCreateInputSchema = z.object({
    Task: CloudTasksTask,
})

export const CloudSchedulerCreateJobSchema = z.object({
    schedule: z.string().describe('Describes the schedule on which the job will be executed. The schedule can be either of the following types: Crontab or English-like schedule'),
    timezone: z.string().describe('Specifies the time zone to be used in interpreting schedule. The value of this field must be a time zone name from the tz database. If needed default to : America/Los_Angeles'),
    prompt: z.string().describe('the user request that will be used in the message of the created job'),
});

export enum Tools {
    cloudTaskTestTool = "cloudTaskTestTool",
    cloudTaskCreateTask = "cloudTaskCreateTask",
    cloudTaskCurrentDateTime = "cloudTaskCurrentDateTime",
    cloudTaskConvertTimeToEpoch = "cloudTaskConvertTimeToEpoch",
    cloudSchedulerCreateJob = "cloudSchedulerCreateJob",
}

export function CloudScheduler(options: CloudSchedulerPluginOptions): GenkitPlugin {
    const parent = `projects/${options.projectId}/locations/${options.region}`
    const schedulerClient = new CloudSchedulerClient();
    return genkitPlugin('cloudScheduler', async (ai: Genkit) => {

        ai.defineTool(
            {
                name: Tools.cloudSchedulerCreateJob,
                description: 'run this tool to create a recurring job in cron format',
                inputSchema: CloudSchedulerCreateJobSchema,
                outputSchema: z.string(),
            },
            async (input) => {
                schedulerClient.createJob({
                    parent: parent,
                    job: {
                        schedule: input.schedule,
                        timeZone: input.timezone,
                        httpTarget:{
                            uri: options.defaultHttpEndpoint,
                            headers: {'Content-Type': 'application/json'},
                            httpMethod: 'POST',
                            body: Buffer.from(JSON.stringify({data: {prompt: input.prompt}})).toString('base64'),
                        },
                        retryConfig: {
                            retryCount: 0,
                            // TODO(@nohe427): Use the config object to set these correctly.
                            maxRetryDuration: {seconds: 0},
                            minBackoffDuration: {seconds: 5},
                            maxBackoffDuration: {seconds: 5},
                            maxDoublings: 5,
                        },
                    }
                })
                return "This is a test";
            }
        )

    });
}

export function CloudTask(options: CloudTaskPluginOptions): GenkitPlugin {
    const taskClient = new CloudTasksClient();
    return genkitPlugin('cloudTask', async (ai:Genkit) => {

        ai.defineTool(
            {
                name: Tools.cloudTaskTestTool,
                description: 'run this tool anytime someone wants to run a test',
                inputSchema: z.object({}),
                outputSchema: z.string(),
            },
            async () => {
                console.log('this is a test tool used for testing tools');
                return "This is a test";
            }
        );

        ai.defineTool(
            {
                name: Tools.cloudTaskCreateTask,
                description: 'Creates a task based on the users request that can be asynchronously executed in the future.',
                inputSchema: CloudTasksTask,
            outputSchema: z.string(),
            },
            async (input): Promise<string> => {
                const parent =`projects/${options.projectId}/locations/${options.region}/queues/${options.queueName}`;
                const result = await taskClient.createTask({
                    parent: parent,
                    task:{
                        scheduleTime: {seconds: input.scheduledTime},
                        httpRequest: {
                            url: options.defaultHttpEndpoint,
                            headers: {'Content-Type': 'application/json'},
                            httpMethod: 'POST',
                            body: Buffer.from(JSON.stringify({data: {prompt: input.prompt}})).toString('base64'),
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
            description: 'This returns the current date and time',
            inputSchema: z.object({}),
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
            inputSchema: z.object({
                timeString: z.string()
            }),
            outputSchema: z.string(),
          },
          async (input) => {
            return ((new Date(input.timeString).getTime())/1000).toString();
          }
        )
    });
}