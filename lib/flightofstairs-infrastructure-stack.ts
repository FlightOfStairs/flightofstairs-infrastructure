import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import { Organization } from "./organization";

export class FlightofstairsInfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new Organization(this, "Organisation");
  }
}
