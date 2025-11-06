import { Construct } from "constructs";
import { CfnAccount, CfnOrganization } from "aws-cdk-lib/aws-organizations";
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from "aws-cdk-lib/custom-resources";
import { Aws } from "aws-cdk-lib";
import { CfnAssignment, CfnPermissionSet } from "aws-cdk-lib/aws-sso";

const adminGroupDisplayName = "Org Admin";

export class Organization extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const org = new CfnOrganization(this, "Organization", {
      featureSet: "ALL",
    });

    const whenToFlyAccount = new CfnAccount(this, "WhenToFly", {
      accountName: "When to Fly",
      email: "aws+when-to-fly@example.com",
      roleName: "OrganizationAccountAccessRole",
      parentIds: [org.attrRootId],
    });

    const ssoDiscovery = new SsoDiscovery(this, "SsoDiscovery");

    const targetAccountIds = [
      Aws.ACCOUNT_ID, // management account
      whenToFlyAccount.attrAccountId,
    ];

    const adminPermissions = new CfnPermissionSet(this, "AdminPermissionSet", {
      instanceArn: ssoDiscovery.instanceArn,
      name: "org-admin",
      description: "Full admin across organisation accounts",
      managedPolicies: ["arn:aws:iam::aws:policy/AdministratorAccess"],
      sessionDuration: "PT8H",
    });

    targetAccountIds.forEach((targetAccountId, idx) => {
      new CfnAssignment(this, `AdminGroupAssignment-${idx}`, {
        instanceArn: ssoDiscovery.instanceArn,
        permissionSetArn: adminPermissions.attrPermissionSetArn,
        principalId: ssoDiscovery.adminGroupId,
        principalType: "GROUP",
        targetId: targetAccountId,
        targetType: "AWS_ACCOUNT",
      });
    });
  }
}

class SsoDiscovery extends Construct {
  public readonly instanceArn: string;
  public readonly identityStoreId: string;
  public readonly adminGroupId: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const ssoLookup = new AwsCustomResource(this, "SsoInstanceLookup", {
      onCreate: {
        service: "SSOAdmin",
        action: "listInstances",
        parameters: {},
        physicalResourceId: PhysicalResourceId.of("sso-instance-lookup"),
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });

    this.instanceArn = ssoLookup.getResponseField("Instances.0.InstanceArn");
    this.identityStoreId = ssoLookup.getResponseField(
      "Instances.0.IdentityStoreId",
    );

    const adminGroupLookup = new AwsCustomResource(this, "AdminGroupLookup", {
      onCreate: {
        service: "IdentityStore",
        action: "listGroups",
        parameters: {
          IdentityStoreId: this.identityStoreId,
          Filters: [
            {
              AttributePath: "DisplayName",
              AttributeValue: adminGroupDisplayName,
            },
          ],
        },
        physicalResourceId: PhysicalResourceId.of(
          `admin-group-${adminGroupDisplayName.replace(/\s+/g, "-")}`,
        ),
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });

    adminGroupLookup.node.addDependency(ssoLookup);

    this.adminGroupId = adminGroupLookup.getResponseField("Groups.0.GroupId");
  }
}
