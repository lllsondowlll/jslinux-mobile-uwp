function KBD(PC, reset_callback) {
    PC.register_ioport_read(0x64, 1, 1, this.read_status.bind(this));
    PC.register_ioport_write(0x64, 1, 1, this.write_command.bind(this));
    this.reset_request = reset_callback;
}
KBD.prototype.read_status = function (mem8_loc) {
    return 0;
};
KBD.prototype.write_command = function (mem8_loc, x) {
    switch (x) {
        case 0xfe:
            this.reset_request();
            break;
        default:
            break;
    }
};