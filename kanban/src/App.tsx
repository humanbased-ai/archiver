import Head from './components/Head'
import Article from './components/Article'
import logo from './assets/logo.svg'

function App() {
  return (
    <div className="flex flex-col h-screen">
      <div className="py-3 flex items-center border-b border-b-solid border-[#E5E8EB] px-10">
        <img className="ml-10 h-6" src={logo} />
      </div>

      <div className="flex justify-center items-center flex-col flex-1">
        <Head />
        <Article />
      </div>
    </div>
  )
}

export default App
