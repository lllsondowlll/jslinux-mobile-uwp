"use strict";

var term, pc, boot_start_time, init_state;
/*
add by hao 终端的代码
*/
function term_start()
{
    term = new Term(80, 30, term_handler);

    term.open();
}

/* send chars to the serial port */
function term_handler(str)
{
    try
    {
        pc.serial.send_chars(str);//add by hao,这里和/dev/clipboard交互 
    }
    catch(e)
    {
        console.log("Failed handing off data to terminal; machine not booted?");
    }
}
var net_handler = function net_handler(str)
{
    // add by hao: 网络交互的核心内容,红黄交替代表网络可用，红色说明websocket已经断了
    console.error("netrecv " + window.btoa(str));
    document.getElementById("test_serial2").style.backgroundColor = "yellow";
    pc.serial2.send_chars(str);//add by hao,这个对应设备 /dev/ttyS1

    if (0)//add by hao ,show network tcpdump 这个地方打开性能会变好,但是没有网络协议的调试内容了
    {
        var data = str.slice(2);
        //console.log("receiving " + data);
        pc.net0.receive_packet(data);
    }
    else
    {
        //console.log("receiving " + str.slice(2));
        var data = new Uint8Array(str.length-2);

        for(var i = 2; i < str.length; i++)
        {
            data[i-2] = str.charCodeAt(i);
        }

        tcpdump_uint8array(data);
        //console.log("--------->net_handler delete net0");
        pc.net0.receive_packet(data);
    }
}


function pad(n, width, z) {
    // http://stackoverflow.com/a/10073788
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
function hexy(s) {
    return pad(s.toString(16), 2, '0')
}

function tcpdump_uint8array(data) {  //add by hao,打印网络协议，目前支持的协议不多
try {
	console.log("dest: " + 
			hexy(data[0]) + ":" +
			hexy(data[1]) + ":" +
			hexy(data[2]) + ":" +
			hexy(data[3]) + ":" +
			hexy(data[4]) + ":" +
			hexy(data[5]));
	console.log("src: " + 
			hexy(data[6]) + ":" +
			hexy(data[7]) + ":" +
			hexy(data[8]) + ":" +
			hexy(data[9]) + ":" +
			hexy(data[10]) + ":" +
			hexy(data[11]));
	console.log("type: " + hexy(data[12]) + hexy(data[13]) + (data[12] == 8 && data[13] == 6 ? "(arp)" : data[12] == 8 && data[13] == 0 ? "(ip)" : "(?)"));

	if (data[12] == 8 && data[13] == 6) {
		// arp
		console.log("arp hardware type: " + hexy(data[14]) + hexy(data[15]) + (data[14] == 0 && data[15] == 1 ? "(ethernet)" : "(?)"));
		console.log("arp protocol type: " + hexy(data[16]) + hexy(data[17]));
		console.log("arp hw address len: " + hexy(data[18]));
		console.log("arp proto address len: " + hexy(data[19]));

		console.log("arp oper: " + hexy(data[20]) + hexy(data[21]));
		console.log("arp sender hw address: " + hexy(data[22]) + hexy(data[23]) + hexy(data[24]) + hexy(data[25]) + hexy(data[26]) + hexy(data[27]));
		console.log("arp sender proto: " + hexy(data[28]) + hexy(data[29]) + hexy(data[30]) + hexy(data[31]));
		console.log("arp target hw address: " + hexy(data[32]) + hexy(data[33]) + hexy(data[34]) + hexy(data[35]) + hexy(data[36]) + hexy(data[37]));
		console.log("arp target proto: " + hexy(data[38]) + hexy(data[39]) + hexy(data[40]) + hexy(data[41]));
	}
	

} catch (e) {
    console.warn("Error while tcpdumping a packet");
    console.log(e);
}
}

function clipboard_set(val)
{
    var el;
    el = document.getElementById("text_clipboard");
    el.value = val;
}

function clipboard_get()
{
    var el;
    el = document.getElementById("text_clipboard");
	if (el != null)
	{
    return el.value;
	} else
	{
		return null;
	}
}

function clear_clipboard()
{
    var el;
    el = document.getElementById("text_clipboard");
    el.value = "";
}

/* just used to display the boot time in the VM */
function get_boot_time()
{
    return (+new Date()) - boot_start_time;
}

function start(kernel_name)
{
	//console.log("start");
    var params;
    
    init_state = new Object();

    params = new Object();

    /* serial output chars */
    params.serial_write = term.write.bind(term);

    var buffer = "";
    var transmitter = false;
    
    params.serial2_write = function(data)
    {
        /*
                add by hao,
                这个地方是把jslinux的 /dev/ttyS1设备传来的数据转给websocket，和server端的tap设备进行通信
                这里是核心交互代码
        */
    	//console.log("--->serial2_write");
        /*
    	document.getElementById("test_serial2").innerHTML = character;
    	var ar = character.split("\r");
    	if(ar.length > 1 && buffer.length > 0){
    		console.log(buffer);
    		buffer = "";
    	}
    	for(var i = 0; i < ar.length-1; i++){
    		var line = ar[i];
    		console.log(line);
    	}
    	buffer += ar[ar.length-1];
    	return true;
	    */
        buffer += data;
        clearTimeout(transmitter);
        if(buffer.length > tuntap_bufferSize){
            console.log("SENDING DATA OUT sz: " + buffer);
            tuntap_sendData(buffer);
            buffer = "";
        }
        transmitter = setTimeout(function(){
            console.log("SENDING DATA OUT tm: " + buffer);
            tuntap_sendData(buffer);
            buffer = "";
        }, tuntap_bufferTimeout);
        /*tuntap_sendData(data);*/
    }

    /* memory size (in bytes) */
    params.mem_size = 16 * 1024 * 1024;

    /* clipboard I/O */
    params.clipboard_get = clipboard_get;
    params.clipboard_set = clipboard_set;

    params.get_boot_time = get_boot_time;

    /* IDE drive. The raw disk image is split into files of
     * 'block_size' KB. 
     * add by hao:
     *      硬盘的加载部分，把大硬盘拆分成小块，加载时可以有限加载部分代码，降低网络延迟
     *      todo1:这部分后续计划改造成indexedDB ,来加快第二次访问的速度
     *      todo2:计划改造成browserfs的方式做文件系统
     */

    //params.hda = { url: "hda%d.bin", block_size: 64, nb_blocks: 912 };
    params.hda = { url: "hao/hda%d.bin", block_size: 64, nb_blocks: 912 };
    
    pc = new PCEmulator(params);//add by hao ,新建模拟器， 代码从这里开始读
//	console.log("start 1");
    init_state.params = params;
    //add by hao: load the kernel
    if (!kernel_name)
        kernel_name = "vmlinux-2.6.20.bin";
        //kernel_name = "vmlinux28.bin";
    pc.load_binary(kernel_name, 0x00100000, start2);
    //console.log("start 2 vmlinux28.bin");
}

function start2(ret)
{
    //add by hao ,加载初始文件，这个文件会从0x10000位置开始加载内核，在编译内核的时候指定的
    if (ret < 0)
        return;
    init_state.start_addr = 0x10000;
    pc.load_binary("linuxstart.bin", init_state.start_addr, start3);
    //console.log("linuxstart1.bin");
}

function start3(ret)
{
	//console.log("start3")
    var block_list;
    if (ret < 0)
        return;
    /* Preload blocks so that the boot time does not depend on the
     * time to load the required disk data (optional) */
    block_list = [ 0, 7, 3];
    //block_list = [ 0, 7, 3, 643, 720, 256, 336, 644, 781, 387, 464, 475, 131, 589, 468, 472, 474, 776, 777, 778, 779, 465, 466, 473, 467, 469, 470, 512, 592, 471, 691, 697, 708, 792, 775, 769 ];
    pc.ide0.drives[0].bs.preload(block_list, start4);//hao
}

function start4(ret)
{
    var cmdline_addr;

    if (ret < 0)
        return;

    /* set the Linux kernel command line */
    cmdline_addr = 0xf800;
    pc.cpu.write_string(cmdline_addr, "console=ttyS0 root=/dev/hda ro init=/sbin/init notsc=1");

    pc.cpu.eip = init_state.start_addr;
    pc.cpu.regs[0] = init_state.params.mem_size; /* eax */
    pc.cpu.regs[3] = 0; /* ebx = initrd_size (no longer used) */
    pc.cpu.regs[1] = cmdline_addr; /* ecx */

    boot_start_time = (+new Date());

    pc.start();
}

term_start();
