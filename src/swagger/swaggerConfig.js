import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Shift Manager API",
      version: "1.0.0",
      description: "API documentation for the Shift Manager backend",
    },
    servers: [
      {
        url: "http://localhost:8000/api",
        description: "Local development server",
      },
      {
        url: "https://orta-full-stack-dev-test-be.onrender.com/api",
        description: "Production server",
      },
    ],
    tags: [
      {
        name: "User",
        description: "User authentication and profile management",
      },
      {
        name: "Password",
        description: "Forgot and Reset Password endpoints",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.js", "./src/models/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
