The test demo is at: [http://www.hackernel.com/jslinux/](http://www.hackernel.com/jslinux/)
The code of this article is at: [https://github.com/killinux/jslinux-tap](https://github.com/killinux/jslinux-tap)
![jslinux with network](https://img-blog.csdnimg.cn/20200624031118211.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2xlYWZyZW5jaGxlYWY=,size_16,color_FFFFFF,t_70#pic_center)

jslinux, which was very popular in 2011, runs Linux on the browser. 10 years later, does anyone still remember this?

The official website of fabrice bellard is: [https://bellard.org/jslinux](https://bellard.org/jslinux) This has become a wasm version, and the code is unreadable, so currently this pure js version is used to learn the Linux kernel The tutorial is still very good.
Unobfuscated jslinux reference: [https://github.com/levskaya/jslinux-deobfuscated](https://github.com/levskaya/jslinux-deobfuscated)
  There is no network, and the hard disk is not that big, but the code is readable.
 
 
**Fork changelog and additions**:

**1. Added hard disk content**:
   
The hard disk is under hao. If you want to modify the hard disk content or generate rootfs, please refer to [Modify jslinux hard disk content](https://www.iteye.com/blog/haoningabc-2240076)

Theoretically, if indexeddb is used as the hard disk, the hard disk should be larger, and browserfs is planned to be added in the future.

**2. Added Networking**: 

Through websocket as the server, the Linux tap device in the browser communicates with the server. Here you need to change the configuration of the kernel compilation. The kernel config option must set TUN=yes
<pre>
The network is divided into three parts:
       (1) The internal network of jslinux is to establish a tap device and interact with the /dev/ttyS1 device. This is the part where jslinux interacts with the browser, similar to /dev/clipboard interacting with textare on the browser. The code to establish the tap device is [tap Code link](https://www.iteye.com/blog/haoningabc-2436305)
       (2) The browser and server are connected using websocket
       (3) The same principle applies to server-side Linux. A bridge is established. One end of the tap device is tied to the bridge and the other end is connected to the websocket.
  </pre>

**Usage Instructions**:

**Running the project code**:

How to run:
**1. Install dependencies**, mod_pywebsocket and bridge-utils:
```shell
cd jslinux/websocketstuntap
yum install python-virtualenv -y
virtualenv mysite
source mysite/bin/activate
pip install mod_pywebsocket
yum install bridge-utils -y
brctl show
```
Specific reference script: launch.sh
Pay attention to setting forwarding of MASQUERADE and ip_forward=1, otherwise the network may be blocked.

**2. Starting the websocketstuntap service**:

This service generates the association between tap devices and websockets, and hangs the tap devices on the br1 bridge. It is the basis for mutual communication between jslinux
```shell
brctl addbr br1
brctl stp br1 on
ip link set br1 promisc on
ip link set br1 up
ifconfig br1 hw ether ee:ee:ee:ee:ee:50
```
You need to specify the MAC address, otherwise the MAC address will become the latest every time you create a new tap, affecting network interaction.
```shell
ifconfig br1 10.0.2.1 netmask 255.0.0.0 up
```
**3. Modifying the websocket client**

The code is at: jslinux-tap/js/network-websockets.js
Modify the WebSocket server in to the newly created websocket service

**4. Launching seperate chrome tabs**

Be careful not to be in the same tab
Enter the command cat /dev/clipboard |sh in jslinux
Here, the tap device is established inside jslinux and the websocket of network-websockets.js is called for interaction through serial2 of PCEmulator.js.
Tap device creation in jslinux:
```shell
stty -F /dev/ttyS1 -ignbrk -brkint -parmrk -istrip -inlcr -igncr -icrnl -ixon -opost -echo -echonl -icanon -isig -iexten -parenb cs8
./tapper --tapper-headers --ip-address 10.0.2.0 --netmask 255.255.255.0 --randomize-ip /dev/ttyS1 /dev/ttyS1 &
```


**The main principle**

```shell
jslinux:/dev/ttyS1
   ----->
     jslinux:tap0
       ----->
         PCEmulator.js:serial2(0x2f8)
           ----->
              network-websockets.js:websocket client
                ----->
                  python:tap_wsh.py:websocket server
                    ----->
                      linux tap:websockettunt0
                        ----->
                          linux bridge: br1
Achieve interoperability between multiple jslinux through bridge:
```


/dev/ttyS1 corresponds to the COM port, serial number 0x2f8
Reference: [Device number defined by Google](https://books.google.com.hk/books?id=u7ZVYFu50hkC&pg=PA719&lpg=PA719&dq=0x2f8%20/dev/ttyS1&source=bl&ots=IZRjCKGEGa&sig=ACfU3U0DNRadlUsVJejKNXo1m_5pYm8E3Q&hl=zh-CN&sa=X&redir_esc=y&sourceid=cndr#v=onepage&q=0x2f8&f=false)

jslinux network driver:
dmesg |grep ttyS*
The serial8250 driver is used. This driver is relatively primitive. I have tried using the e1000 driver and it can also be used. Please refer to [jslinux kernel with network functions](https://www.iteye.com/blog/haoningabc-2338061)

tapper.c creates tap0 in jslinux, and tap_wsh.py creates tap device websockettunt0 in vm. The basic principles are the same.
```shell
jslinux:tap0
       --->jslinux:/dev/ttyS1 driven by 8250 -
          --->websocket
               ---> vm:websockettunt0
```

In jslinux: ping 10.0.2.1
In the server: tcpdump -i websockettunt0 View traffic


**FAQ:**

**1. Dual network network limitations within jslinux**:

Answer: Both jslinux-tap browsers must be in visible places and cannot be placed under tabs. If one is not written and displayed, it will not be loaded. The select in tap_wsh.py is not readable and writable.

**2. Locating server code**:

Answer: Under jslinux-tap/websocketstuntap --use mod_pywebsocket

**3. Interacting with the browser within jslinux**:

Answer: Through textarea --this portion requires kernel driver support.
The code is in src/patch_linux-2.6.20 of [https://github.com/killinux/jslinux-kernel/](https://github.com/killinux/jslinux-kernel/), which defines the jsclipboard device. Corresponds to /dev/clipboard in jslinux
If you want to transfer content from jslinux to the textarea of the browser, use
```shell
echo "haha" >/dev/clipboard
```
If you want to transfer it from the browser to jslinux,
After modifying the content of the textarea,
```shell
cat /dev/clipboard
```
The network equipment in jslinux is established through this
```shell
cat /dev/clipboard |sh
```
**4. Recompiling the kernel**:

Answer: Please refer to [https://www.iteye.com/blog/haoningabc-2338061](https://www.iteye.com/blog/haoningabc-2338061)
Currently, using the 2.6.20 kernel requires some patches. The patch code is in the code [https://github.com/killinux/jslinux-kernel](https://github.com/killinux/jslinux-kernel)
Note that linuxstart.bin and vmlinux-2.6.20.bin need to be recompiled together. linuxstart defines the byte from which the kernel should be loaded.

**5. Virtual hard disk creation**:

answer:
1. Merge scattered hard disk files into one and mount it on the local system
```shell
cd jslinux-tap/hao
cat hda000000*.bin > hda.bin
mount -t ext2 -o loop hda.bin /mnt/jshda
cp -r /mnt/jshda jslinux
```
2. Modify the files in the jslinux hard disk in /mnt/jshda
3. Then split the modified hard disk into small pieces for jslinux to use
```shell
split -a 9 -d -b 65536 hda.bin hda
for f in hda000000*; do
     mv $f $f.bin
done
```
The purpose of splitting it into faster here is to speed up the speed of the browser reading the hard disk.
The specific reading code is in jslinux-tap/jslinux.js
```javascript
params.hda = { url: "hao/hda%d.bin", block_size: 64, nb_blocks: 912 };
```
