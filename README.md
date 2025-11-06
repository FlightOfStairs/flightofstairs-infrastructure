Deployment:

```bash
# Assuming `aws configure sso` has been run
aws sso login --sso-session flightofstairs

AWS_PROFILE=flightofstairs-root npm run deploy
```
