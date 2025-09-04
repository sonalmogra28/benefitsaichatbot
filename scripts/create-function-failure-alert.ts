import { AlertPolicyServiceClient } from '@google-cloud/monitoring';

async function main() {
  const [projectId, functionName, ...channels] = process.argv.slice(2);
  if (!projectId || !functionName) {
    console.error('Usage: tsx scripts/create-function-failure-alert.ts <projectId> <functionName> [channelId...]');
    process.exit(1);
  }

  const client = new AlertPolicyServiceClient();
  const policy = {
    displayName: `${functionName} failure alert`,
    combiner: 'OR',
    conditions: [
      {
        displayName: `Failures of ${functionName}`,
        conditionThreshold: {
          filter: `resource.type="cloud_function" AND resource.label."function_name"="${functionName}" AND metric.type="cloudfunctions.googleapis.com/function/execution_count" AND metric.label."status"="failure"`,
          aggregations: [
            { alignmentPeriod: { seconds: 60 }, perSeriesAligner: 'ALIGN_DELTA' },
          ],
          comparison: 'COMPARISON_GT',
          thresholdValue: 0,
          duration: { seconds: 60 },
          trigger: { count: 1 },
        },
      },
    ],
    notificationChannels: channels,
  };

  const [result] = await client.createAlertPolicy({
    name: client.projectPath(projectId),
    alertPolicy: policy,
  });

  console.log(`Created alert policy ${result.name}`);
}

main().catch((err) => {
  console.error('Failed to create alert policy', err);
  process.exit(1);
});
