#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { FlightofstairsInfrastructureStack } from '../lib/flightofstairs-infrastructure-stack';

const app = new cdk.App();
new FlightofstairsInfrastructureStack(app, 'FlightofstairsInfrastructureStack', {});
