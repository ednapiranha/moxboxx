# -*- mode: ruby -*-
# vi: set ft=ruby :

$script = <<SCRIPT

#####################################
# install system dependencies
#####################################

if ! which mysql;
then
  sudo DEBIAN_FRONTEND=noninteractive add-apt-repository ppa:chris-lea/node.js -y
  sudo DEBIAN_FRONTEND=noninteractive add-apt-repository ppa:chris-lea/redis-server -y
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get -y install mysql-server-5.5 curl python-software-properties python g++ make nodejs git redis-server
fi

#####################################
# configure mysql server
#####################################

if [ ! -f /var/log/databasesetup ];
then
    echo "CREATE USER 'moxboxx'@'localhost' IDENTIFIED BY 'moxboxx'" | mysql -u root
    echo "CREATE DATABASE moxboxx" | mysql -u root 
    echo "GRANT ALL ON moxboxx.* TO 'moxboxx'@'localhost'" | mysql -u root
    echo "flush privileges" | mysql -u root

    curl -Ls http://dl.dropbox.com/u/1913694/moxboxx/moxboxx_prod_2014-05-07.sql | mysql moxboxx -u root
    touch /var/log/databasesetup
fi

#####################################
#  install moxboxx
#####################################

if [ ! -d /root/moxboxx ];
then
    git clone /vagrant ~/moxboxx
    git config --global user.email "vagrant@vagrant.vagrant"
    git config --global user.name "vagrant"
else
    (cd /root/moxboxx; git pull --rebase /vagrant)
fi

if [ ! -f /root/moxboxx/local.json ];
then
  cat << 'EOF' > /root/moxboxx/local.json
{
    "domain": "http://localhost",
    "port": 3000,
    "authPort": 3000,
    "authUrl": "https://login.persona.org",
    "session_secret": "secret",
    "session_cookie": "session_your_cookie_name",
    "s3_url": "https://s3.amazonaws.com/moxboxx_test/",
    "s3_key": "stub",
    "s3_secret": "stub",
    "s3_bucket": "moxboxx_test",
    "database": "moxboxx",
    "db_username": "moxboxx",
    "db_password": "moxboxx",
    "background_default": "/images/back.png",
    "postmark_api_key": "postmark_api_key",
    "twitter_key": "key",
    "twitter_secret": "secret",
    "redis_db": 0
}
EOF
fi

if ! which nodemon;
then
  npm install -g nodemon
fi

if [ ! -f /etc/init/moxboxx.conf ];
then
  cat << 'EOF' > /etc/init/moxboxx.conf
respawn
respawn limit 15 5

start on runlevel [2345]
stop on runlevel [06]

script
    chdir /root/moxboxx/
    echo $$ > /root/moxboxx/moxboxx.pid
    exec sudo nodemon app >> /root/moxboxx/moxboxx.log 2>&1
end script
EOF
  initctl reload-configuration
fi

(cd /root/moxboxx; npm install)
if [ ! -f /root/moxboxx/moxboxx.pid ];
then
  start moxboxx
else
  restart moxboxx
fi

#####################################
# end provisioning script
#####################################

SCRIPT

VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|

   config.vm.box = "ubuntu-14.04"
   config.vm.box_url = "http://cloud-images.ubuntu.com/vagrant/trusty/current/trusty-server-cloudimg-amd64-vagrant-disk1.box"
   config.vm.provision :shell, inline: $script
   config.vm.network "forwarded_port", guest: 3000, host: 3000

end
