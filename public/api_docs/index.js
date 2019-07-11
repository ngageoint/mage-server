import SwaggerUI from 'swagger-ui'
import 'swagger-ui/dist/swagger-ui.css'

SwaggerUI({
  dom_id: '#api_docs',
  url: '/api/docs/openapi.yaml'
});

