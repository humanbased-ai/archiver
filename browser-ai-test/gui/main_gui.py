import asyncio
import tkinter
from tkinter import *

import time

from ai_referral import prompt_call

LOG_LINE_NUM = 0


class MainGUI(tkinter.Tk):
    def __init__(self, init_window_name):
        self.init_window_name = init_window_name

        # 设置窗口

    def set_init_window(self):
        self.init_window_name.title("Browser AI Test")  # 窗口名
        self.init_window_name.geometry('892x668+10+10')

        self.init_data_label = Label(self.init_window_name, text="prompt")
        self.init_data_label.grid(row=0, column=0)

        self.log_label = Label(self.init_window_name, text="logs")
        self.log_label.grid(row=12, column=0)
        # 文本框
        self.init_data_Text = Text(self.init_window_name, width=107, height=35)  # 原始数据录入框
        self.init_data_Text.grid(row=1, column=0, rowspan=10, columnspan=10)

        self.log_data_Text = Text(self.init_window_name, width=106, height=9)  # 日志框
        self.log_data_Text.grid(row=13, column=0, columnspan=10)
        # 按钮
        self.start_browser_ai_bt = Button(self.init_window_name, text="try to start", bg="lightblue", width=10,
                                          command=self.start_browser_ai)  # 调用内部方法  加()为直接调用
        self.start_browser_ai_bt.grid(row=1, column=11)

        self.shut_browser_ai_bt = Button(self.init_window_name, text="stop", bg="lightblue", width=10,
                                         command=self.shut_browser_ai)
        self.shut_browser_ai_bt.grid(row=3, column=11)

    def start_browser_ai(self):
        input_text = self.init_data_Text.get(1.0, END).strip().replace("\n", "")
        if input_text == '':
            self.write_log_to_Text(f"error:please input prompt!")
            return
        self.write_log_to_Text(f"trying to start prompt call:{input_text}")
        time.sleep(1)
        asyncio.run(prompt_call.call(input_text))
        self.write_log_to_Text(f"started prompt call:{input_text}")

    def shut_browser_ai(self):
        asyncio.get_running_loop().stop()
        self.write_log_to_Text(f"ended prompt call")

    def get_current_time(self):
        current_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(time.time()))
        return current_time

    def write_log_to_Text(self, logmsg):
        global LOG_LINE_NUM
        current_time = self.get_current_time()
        logmsg_in = str(current_time) + " " + str(logmsg) + "\n"  # 换行
        if LOG_LINE_NUM <= 7:
            self.log_data_Text.insert(END, logmsg_in)
            LOG_LINE_NUM = LOG_LINE_NUM + 1
        else:
            self.log_data_Text.delete(1.0, 2.0)
            self.log_data_Text.insert(END, logmsg_in)


if __name__ == '__main__':
    init_window = Tk()
    gui = MainGUI(init_window)
    gui.set_init_window()
    init_window.mainloop()
