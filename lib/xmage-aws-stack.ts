import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import {
  CfnApplication,
  CfnApplicationVersion,
  CfnEnvironment,
} from "aws-cdk-lib/aws-elasticbeanstalk";
import {
  Role,
  ServicePrincipal,
  ManagedPolicy,
  CfnInstanceProfile,
} from "aws-cdk-lib/aws-iam";
import { HostedZone, ARecord } from "aws-cdk-lib/aws-route53";
import { DnsValidatedCertificate } from "aws-cdk-lib/aws-certificatemanager";
import { ElasticBeanstalkEnvironmentEndpointTarget } from "aws-cdk-lib/aws-route53-targets";

export class XmageAwsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domain = process.env["DOMAIN"];
    if (domain === undefined) {
      throw new Error("Missing DOMAIN in ENV");
    }
    const hostedZoneId = process.env["HOSTED_ZONE"];
    if (hostedZoneId === undefined) {
      throw new Error("Missing HOSTED_ZONE in ENV");
    }

    // https://docs.aws.amazon.com/cdk/api/latest/docs/aws-cloudfront-readme.html
    // https://aws-blog.de/2020/05/building-a-static-website-with-hugo-and-the-cdk.html
    const hostedZone = HostedZone.fromHostedZoneAttributes(
      this,
      "xmage-hosted-zone",
      {
        hostedZoneId: hostedZoneId,
        zoneName: domain,
      }
    );

    /*const certificate = new DnsValidatedCertificate(this, "xmage-certificate", {
      hostedZone: hostedZone,
      region: "us-east-1", // required for cloudfront
      domainName: domain,
    });*/

    // Construct an S3 asset from the ZIP located from directory up.
    const webAppZipArchive = new Asset(scope, "WebAppZip", {
      path: `${__dirname}/../app.zip`,
    });

    // Create a ElasticBeanStalk app.
    const appName = "MyWebApp";
    const app = new CfnApplication(this, "Application", {
      applicationName: appName,
    });

    // Create an app version from the S3 asset defined earlier
    const appVersionProps = new CfnApplicationVersion(this, "AppVersion", {
      applicationName: appName,
      sourceBundle: {
        s3Bucket: webAppZipArchive.s3BucketName,
        s3Key: webAppZipArchive.s3ObjectKey,
      },
    });

    // Make sure that Elastic Beanstalk app exists before creating an app version
    appVersionProps.addDependsOn(app);

    // Create role and instance profile
    const myRole = new Role(this, `${appName}-aws-elasticbeanstalk-ec2-role`, {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    const managedPolicy = ManagedPolicy.fromAwsManagedPolicyName(
      "AWSElasticBeanstalkWebTier"
    );
    myRole.addManagedPolicy(managedPolicy);

    const myProfileName = `${appName}-InstanceProfile`;

    const instanceProfile = new CfnInstanceProfile(this, myProfileName, {
      instanceProfileName: myProfileName,
      roles: [myRole.roleName],
    });

    // Example of some options which can be configured
    const optionSettingProperties: CfnEnvironment.OptionSettingProperty[] = [
      {
        namespace: "aws:autoscaling:launchconfiguration",
        optionName: "IamInstanceProfile",
        value: myProfileName,
      },
      {
        namespace: "aws:autoscaling:asg",
        optionName: "MinSize",
        value: "1",
      },
      {
        namespace: "aws:autoscaling:asg",
        optionName: "MaxSize",
        value: "1",
      },
      {
        namespace: "aws:ec2:instances",
        optionName: "InstanceTypes",
        value: "t2.micro",
      },
    ];

    // Create an Elastic Beanstalk environment to run the application
    const elbEnv = new CfnEnvironment(this, "Environment", {
      environmentName: "XMageEnvironment",
      applicationName: app.applicationName || appName,
      solutionStackName: "Corretto 17 version 3.4.1",
      optionSettings: optionSettingProperties,
      versionLabel: appVersionProps.ref,
    });

    new ARecord(this, "xmage-arecord", {
      zone: hostedZone,
      target: {
        aliasTarget: new ElasticBeanstalkEnvironmentEndpointTarget(
          elbEnv.attrEndpointUrl
        ),
      },
    });
  }
}
