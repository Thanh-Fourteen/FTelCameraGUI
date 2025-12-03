import { useRoutes } from 'react-router-dom'
import {routesConfig} from './routes'

function App() {
  const element = useRoutes(routesConfig)
  return <>{element}</>
}
export default App
