import os
import sys

from browser_use.agent.views import ActionResult

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import asyncio

from langchain_openai import ChatOpenAI
from browser_use import Agent, Controller
from browser_use.browser.browser import Browser, BrowserConfig

browser = Browser(
	config=BrowserConfig(
		headless=False,
		# NOTE: you need to close your chrome browser - so that this can open your browser in debug mode
		chrome_instance_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	)
)
controller = Controller()

@controller.registry.action('Done task')
async def done(text:str):
	await browser.close()
	print(f'now switching {text}')

	return ActionResult(is_done=True, extracted_content='Context Switched!')

async def main():
	task = (f'''Go to https://www.bitrefill.com/buy,then done''')
	model = ChatOpenAI(model='gpt-4o')
	agent = Agent(
		task=task,
		llm=model,
		controller=controller,
		browser=browser,
	)

	await agent.run()
	await browser.close()

	input('Press Enter to close...')


if __name__ == '__main__':
	asyncio.run(main())