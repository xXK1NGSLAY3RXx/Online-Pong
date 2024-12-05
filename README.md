# Online Pong Game
This repository contains the complete source code and CloudFormation templates for deploying an online multiplayer Pong game using AWS services. The game supports creating, joining, and playing Pong matches in real-time, leveraging the scalability and resilience of AWS infrastructure.

# Overview
The Online Pong Game is a real-time multiplayer game hosted on AWS. Players can:
Create a game session and invite others to join via email.
Play Pong with real-time ball and paddle synchronization using WebSockets.
Monitor game states dynamically on the browser.
The backend, frontend, and game logic are fully integrated into AWS services.

# Architecture
AWS Services Used:
- Amazon S3: Hosts the frontend assets and serves the game's web interface.
- Amazon API Gateway: Exposes REST APIs for game session management (create, join, and invite).
- AWS Lambda: Backend logic for creating and joining games, sending invitations, and handling APIs.
- Amazon DynamoDB: Stores game state data, including player information and game codes.
- Amazon EC2: Hosts the WebSocket server for real-time game synchronization.
- Amazon CloudWatch: Monitors system and application metrics for performance and troubleshooting.
- Amazon SNS: Sends email invitations for joining games.
- AWS CloudFormation: Automates the deployment of the entire infrastructure.

# Features
- Real-time Pong gameplay with WebSocket communication.
- Game session management (create and join games).
- Player invitation system via email using Amazon SNS.
- Dynamic game state updates with a visually appealing UI.
- Automated deployment with AWS CloudFormation.

# Technologies Used
- Frontend: React, Socket.IO, HTML/CSS.
- Backend: Node.js, Express, AWS SDK.
- Database: Amazon DynamoDB.
- Infrastructure as Code (IaC): AWS CloudFormation.

# Setup and Deployment
- Prerequisites
AWS Account: Ensure you have an AWS account with sufficient permissions to create resources.

AWS CLI: Install and configure the AWS CLI with appropriate credentials.

Node.js & npm: Ensure Node.js (v18 or later) and npm are installed.

CloudFormation Permissions: Grant permissions to deploy CloudFormation stacks.

- Deployment Steps

1. Clone the Repository

2. Create an S3 bucket with 3 directories: frontend, backend, lambdas

2. Upload the files on the s3 bucket. 

for building frontend assets:

npm install

npm run build

3. Update the cloud formation parameters like service ARNs and roles

4. Upload the cloudformation-template.yaml file in the CloudFormation service.

5. Open the S3 bucket's static website URL to access the game.

5. Create a game and invite players via email.

6. Test the game

# Usage
- Creating a Game
  
Access the frontend URL from the S3 bucket or CloudFront distribution.

Click "Create Game" to generate a unique game code.

Share the code with a friend or invite them via email.

Joining a Game

Enter the game code shared by the host.

Join as the second player and start the game.

# Game Controls

Player 1: Use W and S keys to move the paddle.

Player 2: Use ↑ and ↓ keys to move the paddle.

