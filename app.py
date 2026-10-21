import tkinter as tk


def main():
    root = tk.Tk()
    root.title('ZYRAXON desktop')
    tk.Label(root, text='Hello from ZYRAXON').pack(padx=40, pady=20)
    root.after(1200, root.destroy)
    root.mainloop()


if __name__ == '__main__':
    main()
